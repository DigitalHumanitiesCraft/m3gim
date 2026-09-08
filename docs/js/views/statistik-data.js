/**
 * Statistik — reine Datenschicht.
 *
 * Aggregationen ueber den Live-Store, ohne DOM und ohne d3. Jede Aggregation
 * nimmt neben dem Store die Dokumentmenge des aktuellen Schnitts (`ids` aus
 * `recordsFor`) und zaehlt darin; ohne Menge zaehlt sie den ganzen Store. Damit
 * schneiden die geteilten Facetten und der Zeitraum die Statistik, ohne dass
 * die Ansicht einen zweiten Filterweg baut.
 *
 * Since E-160 the Statistik carries the fonds in numbers only. The mobility and
 * relation aggregates live in Karte, Chronik and Netzwerk; the ranked colour
 * scale below stays here, because those two views read it from here.
 */

import {
  getDocTypeId, dftLabel, expandDftFilter, ensureArray, entityName,
  roleIdOf, roleLabel, roleToken, cityOf,
} from '../utils/format.js';
import { normalizePerson } from '../utils/normalize.js';
import { AGRELON_LABELS } from '../data/constants.js';
import { primaryYear } from '../data/loader.js';
import { baseIds, recordsFor } from '../data/records-for.js';
import { extractXlsxSource } from '../utils/provenance.js';

// ---------------------------------------------------------------------------
// Der Schnitt als Zaehlgrundlage
// ---------------------------------------------------------------------------

/** Records des Schnitts; ohne Menge der ganze Store. */
function cutRecords(store, ids) {
  const all = (store && store.allRecords) || [];
  return ids instanceof Set ? all.filter(r => ids.has(r['@id'])) : all;
}

/** Groesse der Schnittmenge einer Record-Id-Menge mit dem Schnitt. */
function countIn(recordIds, ids) {
  if (!recordIds) return 0;
  if (!(ids instanceof Set)) return recordIds.size || 0;
  let n = 0;
  for (const id of recordIds) if (ids.has(id)) n += 1;
  return n;
}

const byCountDesc = (a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de');

// ---------------------------------------------------------------------------
// Dokumenttypen
// ---------------------------------------------------------------------------

export function aggregateDocTypes(store, ids) {
  const direct = new Map();
  const ohneTyp = new Set();
  for (const rec of cutRecords(store, ids)) {
    const id = getDocTypeId(rec);
    if (!id) { ohneTyp.add(rec['@id']); continue; }
    let recordIds = direct.get(id);
    if (!recordIds) { recordIds = new Set(); direct.set(id, recordIds); }
    recordIds.add(rec['@id']);
  }
  const counts = new Map();
  for (const id of direct.keys()) {
    const recordIds = new Set();
    for (const member of expandDftFilter(store, id)) {
      for (const recordId of direct.get(member) || []) recordIds.add(recordId);
    }
    counts.set(id, recordIds);
  }
  const rows = [...counts.entries()]
    // dftLabel prefixes the short id before the lookup; a bare id never hits
    // store.dftHierarchy and would silently fall back to the technical key.
    .map(([id, recordIds]) => ({
      id, count: recordIds.size, label: dftLabel(store, id), recordIds: [...recordIds],
    }))
    .sort((a, b) => b.count - a.count);
  if (ohneTyp.size > 0) {
    rows.push({ id: null, count: ohneTyp.size, label: 'ohne Typ', recordIds: [...ohneTyp] });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Entitaeten: Personen, Institutionen, Werke
// ---------------------------------------------------------------------------

/**
 * Eintraege einer Entitaets-Map mit ihrer Dokumentzahl im Schnitt. Der Name ist
 * zugleich der Facettenwert, mit dem die Zeile in den Bestand fuehrt.
 * @param {object} store
 * @param {string} mapName  persons | organizations | works
 * @param {?Set<string>} ids
 * @returns {Array<{value:string, label:string, count:number}>}
 */
export function aggregateEntities(store, mapName, ids) {
  const source = store && store[mapName];
  if (!source) return [];
  const out = [];
  for (const [name, entry] of source) {
    const count = countIn(entry && entry.records, ids);
    if (count === 0) continue;
    const recordIds = [...entry.records].filter((id) => !(ids instanceof Set) || ids.has(id));
    out.push({ value: name, label: name, count, recordIds });
  }
  return out.sort(byCountDesc);
}

/**
 * Rollen der Mitwirkenden mit ihrer Dokumentzahl im Schnitt, aus
 * store.recordsByAgentRole. Rollen ohne Anzeigeform bleiben draussen
 * (E-143), sie waeren als nackte Concept-Id keine Aussage.
 */
export function aggregateAgentRoles(store, ids) {
  const index = store && store.recordsByAgentRole;
  if (!index) return [];
  const out = [];
  for (const [value, recordIds] of index) {
    const count = countIn(recordIds, ids);
    if (count === 0) continue;
    const entry = store.roleVocab ? store.roleVocab.get(value) : null;
    const label = (entry && entry.label) || '';
    if (!label) continue;
    const idsInCut = [...recordIds].filter((id) => !(ids instanceof Set) || ids.has(id));
    out.push({ value, label, count, recordIds: idsInCut });
  }
  return out.sort(byCountDesc);
}

/**
 * Buehnenrollen (Partien) mit der Zahl der Dokumente im Schnitt, die sie
 * belegen. Sie haengen an den Auffuehrungen, nicht am Record, und tragen
 * deshalb keine Facette.
 */
export function aggregateStageRoles(store, ids) {
  const index = store && store.recordToPerformances;
  if (!index) return [];
  const perRole = new Map();
  for (const [recordId, performances] of index) {
    if (ids instanceof Set && !ids.has(recordId)) continue;
    for (const perf of performances || []) {
      for (const role of (perf && perf.stageRoles) || []) {
        if (!role) continue;
        let set = perRole.get(role);
        if (!set) { set = new Set(); perRole.set(role, set); }
        set.add(recordId);
      }
    }
  }
  return [...perRole.entries()]
    .map(([label, set]) => ({ label, count: set.size, recordIds: [...set] }))
    .sort(byCountDesc);
}

/**
 * Komponisten mit der Zahl der Dokumente im Schnitt, die eines ihrer Werke
 * nennen. Distinkt gezaehlt, damit ein Dokument mit zwei Werken desselben
 * Komponisten einmal zaehlt.
 */
export function aggregateComposers(store, ids) {
  const works = store && store.works;
  if (!works) return [];
  const perComposer = new Map();
  for (const entry of works.values()) {
    const komponist = (entry && entry.komponist || '').trim();
    if (!komponist) continue;
    let set = perComposer.get(komponist);
    if (!set) { set = new Set(); perComposer.set(komponist, set); }
    for (const id of entry.records || []) {
      if (!(ids instanceof Set) || ids.has(id)) set.add(id);
    }
  }
  return [...perComposer.entries()]
    .map(([label, set]) => ({ label, count: set.size, recordIds: [...set] }))
    .filter(row => row.count > 0)
    .sort(byCountDesc);
}

// ---------------------------------------------------------------------------
// Dashboard aggregate and evidence contract
// ---------------------------------------------------------------------------

const SOURCE_KEYS = ['sheet', 'row', 'datenpunkt'];

function sourceOf(value) {
  const source = value && (value.xlsxSource || extractXlsxSource(value));
  if (!source || !source.sheet || !source.row) return null;
  return Object.fromEntries(SOURCE_KEYS.filter(key => source[key] != null)
    .map(key => [key, source[key]]));
}

function sourceKey(source) {
  return source ? JSON.stringify(SOURCE_KEYS.map(key => source[key] ?? null)) : '';
}

function sourceRefKey(source) {
  if (!source) return '';
  if (source.key) return source.key;
  return JSON.stringify([source.recordId || null,
    ...SOURCE_KEYS.map(key => source[key] ?? null),
    source.nodeId || null, source.kind || null]);
}

function uniqueObjects(values, keyOf) {
  const found = new Map();
  for (const value of values || []) {
    const key = keyOf(value);
    if (!found.has(key)) found.set(key, value);
  }
  return [...found.values()];
}

function witness(kind, key, label, recordId, value, extra = {}) {
  const source = sourceOf(value);
  return { kind, key: String(key ?? ''), label: String(label ?? key ?? ''), recordId,
    source: source ? { ...source, recordId } : null, sourceKey: sourceKey(source), ...extra };
}

function aggregate({ key, label, recordIds = [], unit = 'documents', denominator = null,
  witnesses = [], sourceRefs = [], descriptor = null, ...extra }) {
  const ids = [...new Set(recordIds)].sort();
  const ws = uniqueObjects(witnesses,
    item => item.id || item.sourceRef?.key
      || JSON.stringify([item.kind, item.key, item.recordId, item.sourceKey || '']));
  const witnessRefs = ws.map(item => item.sourceRef || item.source).filter(Boolean)
    .map(source => source.recordId ? source : { ...source,
      recordId: ws.find(item => (item.sourceRef || item.source) === source)?.recordId || null });
  const supplementalRefs = sourceRefs.filter(Boolean).filter(source => !witnessRefs.some(ref => sourceKey(ref) === sourceKey(source)));
  const refs = uniqueObjects([...witnessRefs, ...supplementalRefs], sourceRefKey);
  return {
    key: String(key), label: String(label), recordIds: ids,
    count: unit === 'documents' ? ids.length : (ws.length || refs.length),
    unit, denominator: denominator == null ? ids.length : denominator,
    witnesses: ws, sourceRefs: refs,
    descriptor: descriptor || { type: 'records', ids }, ...extra,
  };
}

function recordsInCut(store, ids) {
  return ids instanceof Set ? cutRecords(store, ids) : [];
}

function recordWitness(record, kind = 'record', key = null, label = null) {
  return witness(kind, key || record['@id'], label || record['rico:identifier'] || record['@id'],
    record['@id'], record);
}

function primaryAnchorEvidence(store, record, anchor) {
  if (!anchor?.source || ['rico:date', 'rico:creationDate'].includes(anchor.source)) return record;
  return (store.recordDatings?.get(record['@id']) || []).find(dating => (
    dating.roleId === anchor.roleId
    && dating.year === anchor.year
    && dating.date === anchor.date
  )) || record;
}

function conceptId(value) {
  return String(value || '').replace(/^m3gim-vocab:/, '');
}

/** Hierarchy whose leaves partition the cut, including parent-direct and missing assignments. */
export function aggregateTreemap(store, ids) {
  const records = recordsInCut(store, ids);
  const direct = new Map();
  for (const record of records) {
    const type = getDocTypeId(record) || '__missing__';
    if (!direct.has(type)) direct.set(type, []);
    direct.get(type).push(record);
  }
  const hierarchy = store?.dftHierarchy || new Map();
  const childrenOf = id => hierarchy.get(`m3gim-vocab:${id}`)?.children
    ?.map(conceptId).filter(Boolean) || [];
  const roots = [];
  const childIds = new Set();
  for (const concept of hierarchy.values()) for (const child of concept.children || []) childIds.add(conceptId(child));
  const hasDirectBelow = id => direct.has(id) || childrenOf(id).some(hasDirectBelow);
  for (const [fullId] of hierarchy) {
    const id = conceptId(fullId);
    if (!childIds.has(id) && hasDirectBelow(id)) roots.push(id);
  }
  for (const id of direct.keys()) if (id !== '__missing__' && !hierarchy.has(`m3gim-vocab:${id}`)) roots.push(id);

  function node(id, path) {
    const directRecords = direct.get(id) || [];
    const childNodes = childrenOf(id).map(child => node(child, [...path, id]))
      .filter(child => child.recordIds.length > 0);
    const children = [...childNodes];
    if (directRecords.length && childNodes.length) {
      children.unshift(aggregate({ key: `${id}:direct`, label: `${dftLabel(store, id)} · direkt zugeordnet`,
        recordIds: directRecords.map(r => r['@id']), witnesses: directRecords.map(r => recordWitness(r, 'document-type', id, dftLabel(store, id))),
        denominator: records.length, descriptor: { facet: 'docType', value: id }, leaf: true, residual: true,
        path: [...path, id] }));
    }
    const ownIds = directRecords.map(r => r['@id']);
    const allIds = [...new Set([...ownIds, ...childNodes.flatMap(child => child.recordIds)])];
    return aggregate({ key: id, label: dftLabel(store, id), recordIds: allIds,
      witnesses: [...directRecords.map(r => recordWitness(r, 'document-type', id, dftLabel(store, id))),
        ...childNodes.flatMap(child => child.witnesses)], denominator: records.length,
      descriptor: { facet: 'docType', value: id }, children, leaf: children.length === 0,
      path: [...path, id] });
  }

  const children = [...new Set(roots)].map(id => node(id, [])).filter(row => row.recordIds.length);
  if (direct.has('__missing__')) {
    const missing = direct.get('__missing__');
    children.push(aggregate({ key: '__missing__', label: 'Ohne Dokumenttyp',
      recordIds: missing.map(r => r['@id']), witnesses: missing.map(r => recordWitness(r, 'document-type', '', 'Ohne Dokumenttyp')),
      denominator: records.length, leaf: true, path: ['__missing__'] }));
  }
  return aggregate({ key: 'all', label: 'Dokumente', recordIds: records.map(r => r['@id']),
    witnesses: children.flatMap(row => row.witnesses), denominator: records.length, children, path: [] });
}

export const MATRIX_PAIRS = Object.freeze([
  { id: 'doctype-work', row: 'doctype', column: 'work', label: 'Dokumenttyp × Werk', binding: 'co-mention' },
  { id: 'doctype-time', row: 'doctype', column: 'time', label: 'Dokumenttyp × Zeit', binding: 'recorded' },
  { id: 'time-work', row: 'time', column: 'work', label: 'Zeit × Werk', binding: 'co-mention' },
  { id: 'time-composer', row: 'time', column: 'composer', label: 'Zeit × Komponist', binding: 'derived' },
  { id: 'time-stagepart', row: 'time', column: 'stagepart', label: 'Zeit × Bühnenrolle', binding: 'co-mention' },
  { id: 'time-person', row: 'time', column: 'person', label: 'Zeit × Person', binding: 'co-mention' },
  { id: 'time-institution', row: 'time', column: 'institution', label: 'Zeit × Institution', binding: 'co-mention' },
  { id: 'time-place', row: 'time', column: 'place', label: 'Zeit × Ort', binding: 'co-mention' },
  { id: 'time-country', row: 'time', column: 'country', label: 'Zeit × Land', binding: 'co-mention' },
  { id: 'doctype-composer', row: 'doctype', column: 'composer', label: 'Dokumenttyp × Komponist', binding: 'derived' },
  { id: 'doctype-stagepart', row: 'doctype', column: 'stagepart', label: 'Dokumenttyp × Bühnenrolle', binding: 'co-mention' },
  { id: 'doctype-person', row: 'doctype', column: 'person', label: 'Dokumenttyp × Person', binding: 'co-mention' },
  { id: 'doctype-institution', row: 'doctype', column: 'institution', label: 'Dokumenttyp × Institution', binding: 'co-mention' },
  { id: 'doctype-place', row: 'doctype', column: 'place', label: 'Dokumenttyp × Ort', binding: 'co-mention' },
  { id: 'doctype-country', row: 'doctype', column: 'country', label: 'Dokumenttyp × Land', binding: 'co-mention' },
  { id: 'work-institution', row: 'work', column: 'institution', label: 'Werk × Institution', binding: 'co-mention' },
  { id: 'work-composer', row: 'work', column: 'composer', label: 'Werk × Komponist', binding: 'recorded' },
  { id: 'work-stagepart', row: 'work', column: 'stagepart', label: 'Werk × Bühnenrolle', binding: 'performance' },
  { id: 'place-placerole', row: 'place', column: 'placerole', label: 'Ort × eigene Ortsrolle', binding: 'statement' },
  { id: 'agent-agentrole', row: 'agent', column: 'agentrole', label: 'Akteur × eigene Akteursrolle', binding: 'statement' },
  { id: 'agent-relation', row: 'agent', column: 'counterpart', label: 'Akteur × Beziehung oder Ko-Mention', binding: 'explicit-vs-co-mention' },
]);

function addMember(index, recordId, member) {
  if (!index.has(recordId)) index.set(recordId, []);
  const values = index.get(recordId);
  if (!values.some(value => value.key === member.key && value.witness.sourceKey === member.witness.sourceKey)) values.push(member);
}

function dimensionIndex(store, records, dimension, placeStatements) {
  const index = new Map();
  const recordIds = new Set(records.map(record => record['@id']));
  const member = (record, key, label, value = record, extra = {}) => addMember(index, record['@id'], {
    key: String(key), label: String(label), witness: witness(dimension, key, label, record['@id'], value, extra), ...extra,
  });
  for (const record of records) {
    const id = record['@id'];
    if (dimension === 'doctype') member(record, getDocTypeId(record) || '__missing__', getDocTypeId(record) ? dftLabel(store, getDocTypeId(record)) : 'Ohne Dokumenttyp');
    if (dimension === 'time') {
      const anchor = primaryYear(store, record);
      member(record, anchor.year ?? '__undated__', anchor.year ?? 'Undatiert', primaryAnchorEvidence(store, record, anchor),
        { anchorSource: anchor.source || null, anchorDate: anchor.date || null });
    }
    if (['work', 'person', 'institution'].includes(dimension)) {
      const subjects = ensureArray(record['rico:hasOrHadSubject']);
      const agents = ensureArray(record['m3gim-ontology:hasAssociatedAgent']);
      const candidates = dimension === 'work'
        ? subjects.filter(v => v['@type'] === 'm3gim-ontology:MusicalWork')
        : dimension === 'person'
          ? [...agents, ...subjects].filter(v => v['@type'] === 'rico:Person'
            || (!v['@type'] && store.persons?.has(entityName(v))))
          : [...agents, ...subjects].filter(v => ['rico:CorporateBody', 'rico:Group'].includes(v['@type']));
      for (const value of candidates) {
        const label = entityName(value);
        if (label) member(record, label, label, value);
      }
    }
    if (dimension === 'composer') {
      for (const [work, entry] of store.works || []) if (entry.records?.has(id) && entry.komponist) {
        const original = ensureArray(record['rico:hasOrHadSubject'])
          .find(value => value['@type'] === 'm3gim-ontology:MusicalWork' && entityName(value) === work) || record;
        member(record, entry.komponist, entry.komponist, original, { work });
      }
    }
    if (dimension === 'stagepart') {
      for (const performance of store.recordToPerformances?.get(id) || []) {
        for (const part of performance.stageRoles || []) {
          const label = typeof part === 'string' ? part : entityName(part, part?.name || part?.['@id'] || '');
          if (label) member(record, label, label, part, { performanceId: performance.id });
        }
      }
    }
  }
  if (['place', 'placerole', 'country'].includes(dimension)) {
    for (const statement of placeStatements || []) {
      if (!recordIds.has(statement.recordId)) continue;
      const record = store.records.get(statement.recordId);
      if (!record) continue;
      if (dimension === 'place') member(record, cityOf(statement.place), cityOf(statement.place), statement);
      if (dimension === 'country') member(record, statement.placeCountry || '__missing__', statement.placeCountry || 'Land nicht erfasst', statement);
      if (dimension === 'placerole') {
        const key = statement.roleId || statement.role || '__missing__';
        member(record, key, statement.roleLabel || roleLabel(store, key) || 'Rolle nicht erfasst', statement);
      }
    }
  }
  return index;
}

function agentEntriesForRecord(store, record, family = null) {
  const candidates = [
    ...ensureArray(record?.['m3gim-ontology:hasAssociatedAgent']),
    ...ensureArray(record?.['rico:hasOrHadSubject']),
  ];
  const out = [];
  for (const entry of candidates) {
    const type = entry?.['@type'];
    const entryFamily = type === 'rico:Person' ? 'person'
      : ['rico:CorporateBody', 'rico:Group'].includes(type) ? 'institution'
        : (!type && store.persons?.has(normalizePerson(entityName(entry)))) ? 'person' : null;
    if (!entryFamily || (family && entryFamily !== family)) continue;
    const rawName = entityName(entry);
    const name = entryFamily === 'person' ? normalizePerson(rawName) : rawName;
    if (!name) continue;
    out.push({ entry, family: entryFamily, name,
      role: roleIdOf(entry.role) || roleToken(entry.role) || '__missing__' });
  }
  return out;
}

function relationMatrixRows(store, records) {
  const rows = [];
  const relationshipPairs = new Set();
  for (const relations of store.agentRelations?.values() || []) {
    for (const relation of relations) {
      const counterpart = normalizePerson(relation.objectName || '');
      if (!counterpart) continue;
      relationshipPairs.add(['Malaniuk, Ira', counterpart]
        .sort((a, b) => a.localeCompare(b, 'de')).join('\u0000'));
    }
  }
  for (const record of records) {
    const recordId = record['@id'];
    const people = agentEntriesForRecord(store, record, 'person');
    const byName = new Map();
    for (const person of people) if (!byName.has(person.name)) byName.set(person.name, person);
    const names = [...byName.keys()].sort((a, b) => a.localeCompare(b, 'de'));
    for (let leftIndex = 0; leftIndex < names.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < names.length; rightIndex += 1) {
        const left = byName.get(names[leftIndex]);
        const right = byName.get(names[rightIndex]);
        if (!relationshipPairs.has([left.name, right.name].join('\u0000'))) continue;
        rows.push({
          row: { key: `person:${left.name}`, label: left.name },
          column: { key: `co-mention:person:${right.name}`, label: `${right.name} · Dokument-Co-Mention` },
          recordId,
          witnesses: [
            witness('agent', `person:${left.name}`, left.name, recordId, left.entry, { family: 'person' }),
            witness('agent', `person:${right.name}`, right.name, recordId, right.entry, { family: 'person' }),
          ],
          binding: 'co-mention',
        });
      }
    }
    for (const relation of store.agentRelations?.get(recordId) || []) {
      const counterpart = normalizePerson(relation.objectName || '');
      if (!counterpart) continue;
      const pair = ['Malaniuk, Ira', counterpart].sort((a, b) => a.localeCompare(b, 'de'));
      const relationLabel = AGRELON_LABELS[relation.type] || String(relation.type || 'Beziehung').replace(/^agrelon:/, '');
      rows.push({
        row: { key: `person:${pair[0]}`, label: pair[0] },
        column: { key: `relation:person:${pair[1]}`, label: `${pair[1]} · explizite Beziehung (${relationLabel})` },
        recordId,
        witnesses: [witness('agent-relation', `${pair[0]}:${pair[1]}:${relation.type || ''}`,
          `${pair[0]} – ${pair[1]} (${relationLabel})`, recordId, relation,
          { relationType: relation.type || null, counterpart })],
        binding: 'relationship',
      });
    }
  }
  return rows;
}

function boundMatrixRows(store, records, pair, placeStatements) {
  const cells = [];
  const recordIds = new Set(records.map(record => record['@id']));
  if (pair.id === 'place-placerole') {
    for (const statement of placeStatements || []) {
      if (!recordIds.has(statement.recordId)) continue;
      cells.push({ row: { key: cityOf(statement.place), label: cityOf(statement.place) },
        column: { key: statement.roleId || statement.role || '__missing__', label: statement.roleLabel || roleLabel(store, statement.roleId || statement.role) || 'Rolle nicht erfasst' },
        recordId: statement.recordId, witnesses: [witness('place-statement', statement.id || statement.place,
          statement.place, statement.recordId, statement)], binding: 'statement', source: sourceOf(statement) });
    }
  }
  if (pair.id === 'agent-agentrole') {
    for (const record of records) {
      for (const item of agentEntriesForRecord(store, record)) {
        const role = item.role;
        cells.push({ row: { key: `${item.family}:${item.name}`, label: item.name },
          column: { key: role, label: role === '__missing__'
            ? 'Ohne erfasste Rolle' : roleLabel(store, item.entry.role) || roleToken(item.entry.role) || role },
          recordId: record['@id'],
          witnesses: [witness('agent-role', `${item.family}:${item.name}:${role}`, item.name,
            record['@id'], item.entry, { family: item.family, role: role === '__missing__' ? null : role })],
          binding: 'statement' });
      }
    }
  }
  if (pair.id === 'agent-relation') cells.push(...relationMatrixRows(store, records));
  if (pair.id === 'work-composer') {
    for (const [work, entry] of store.works || []) if (entry.komponist) for (const recordId of entry.records || []) {
      if (recordIds.has(recordId)) {
        const record = store.records.get(recordId);
        const original = ensureArray(record?.['rico:hasOrHadSubject'])
          .find(value => value['@type'] === 'm3gim-ontology:MusicalWork' && entityName(value) === work) || record;
        cells.push({ row: { key: work, label: work }, column: { key: entry.komponist, label: entry.komponist },
        recordId, witnesses: [witness('work-composer', `${work}:${entry.komponist}`, work, recordId, original, { work, composer: entry.komponist })],
        binding: 'recorded', source: null });
      }
    }
  }
  if (pair.id === 'work-stagepart') {
    for (const record of records) {
      const recordWorks = ensureArray(record['rico:hasOrHadSubject'])
        .filter(value => value['@type'] === 'm3gim-ontology:MusicalWork').map(entityName).filter(Boolean);
      for (const performance of store.recordToPerformances?.get(record['@id']) || []) {
        for (const part of performance.stageRoles || []) {
          const partLabel = typeof part === 'string' ? part : entityName(part, part?.name || part?.['@id'] || '');
          if (!partLabel) continue;
          const recorded = performance.work?.name;
          const derived = !recorded && recordWorks.length === 1 ? recordWorks[0] : null;
          const work = recorded || derived || '__unassigned__';
          const mode = recorded ? 'recorded' : derived ? 'derived-single-work' : 'unassigned';
          cells.push({ row: { key: work, label: work === '__unassigned__' ? 'Werk nicht zugeordnet' : work },
            column: { key: partLabel, label: partLabel }, recordId: record['@id'],
            witnesses: [witness('performance-part', `${performance.id}:${partLabel}`, partLabel, record['@id'], part,
              { performanceId: performance.id, association: mode })], binding: mode, source: sourceOf(part) });
        }
      }
    }
  }
  return cells;
}

/** Compatible matrix with explicit binding provenance and complete backing records. */
export function aggregateMatrix(store, ids, pairId = 'doctype-work', { placeStatements = [] } = {}) {
  const pair = MATRIX_PAIRS.find(value => value.id === pairId) || MATRIX_PAIRS[0];
  const records = recordsInCut(store, ids);
  let rows = boundMatrixRows(store, records, pair, placeStatements);
  if (!rows.length && !['place-placerole', 'agent-agentrole', 'agent-relation', 'work-composer', 'work-stagepart'].includes(pair.id)) {
    const rowIndex = dimensionIndex(store, records, pair.row, placeStatements);
    const columnIndex = dimensionIndex(store, records, pair.column, placeStatements);
    for (const record of records) {
      for (const row of rowIndex.get(record['@id']) || []) for (const column of columnIndex.get(record['@id']) || []) {
        rows.push({ row, column, recordId: record['@id'], witnesses: [row.witness, column.witness],
          binding: pair.binding, source: null });
      }
    }
  }
  const grouped = new Map();
  for (const item of rows) {
    const key = JSON.stringify([item.row.key, item.column.key, item.binding]);
    if (!grouped.has(key)) grouped.set(key, { row: item.row, column: item.column,
      binding: item.binding, recordIds: [], witnesses: [], sourceRefs: [] });
    const group = grouped.get(key);
    group.recordIds.push(item.recordId); group.witnesses.push(...item.witnesses);
    if (item.source) group.sourceRefs.push(item.source);
  }
  const cells = [...grouped.entries()].map(([key, group]) => aggregate({ key, label: `${group.row.label} × ${group.column.label}`,
    ...group, denominator: records.length,
    dimensions: {
      pair: pair.id,
      binding: group.binding,
      row: { family: pair.row, key: group.row.key, label: group.row.label },
      column: { family: pair.column, key: group.column.key, label: group.column.label },
    },
  }));
  const dimensions = [pair.row, pair.column].filter(dimension =>
    !['agent', 'agentrole', 'counterpart'].includes(dimension)).map(dimension => ({
    dimension, recordIds: [...dimensionIndex(store, records, dimension, placeStatements).keys()],
  }));
  return { pair, cells, dimensions, rows: uniqueObjects(cells.map(cell => cell.row), value => value.key),
    columns: uniqueObjects(cells.map(cell => cell.column), value => value.key), denominator: records.length };
}

/** Distinct documents by their one primary anchor; undated documents stay separately reachable. */
export function aggregateTime(store, ids, grouping = 'year', { stack = null } = {}) {
  const records = recordsInCut(store, ids);
  const groups = new Map();
  for (const record of records) {
    const anchor = primaryYear(store, record);
    let start = null;
    if (anchor.year != null) start = grouping === 'decade' ? Math.floor(anchor.year / 10) * 10
      : grouping === 'five' ? Math.floor(anchor.year / 5) * 5 : anchor.year;
    const key = start == null ? '__undated__' : String(start);
    const label = start == null ? 'Undatiert' : grouping === 'decade' ? `${start}–${start + 9}`
      : grouping === 'five' ? `${start}–${start + 4}` : String(start);
    if (!groups.has(key)) groups.set(key, { label, records: [], witnesses: [], stacks: new Map() });
    const group = groups.get(key);
    group.records.push(record['@id']);
    group.witnesses.push(witness('primary-anchor', anchor.source || 'rico:date', label, record['@id'],
      primaryAnchorEvidence(store, record, anchor),
      { anchorSource: anchor.source || null, anchorDate: anchor.date || null }));
    if (stack === 'doctype') {
      const type = getDocTypeId(record) || '__missing__';
      const label = type === '__missing__' ? 'Ohne Dokumenttyp' : dftLabel(store, type);
      if (!group.stacks.has(type)) group.stacks.set(type, { key: type, label, recordIds: [] });
      group.stacks.get(type).recordIds.push(record['@id']);
    }
  }
  return [...groups.entries()].map(([key, value]) => aggregate({ key, label: value.label,
    recordIds: value.records, witnesses: value.witnesses, denominator: records.length,
    stacks: [...value.stacks.values()].map(part => aggregate({ ...part,
      key: `${key}:${part.key}`, label: `${value.label} · ${part.label}`, denominator: records.length })),
    descriptor: key === '__undated__' ? { type: 'records', ids: value.records }
      : { facet: 'zeitfenster', value: grouping === 'year' ? [+key, +key]
        : grouping === 'five' ? [+key, +key + 4] : [+key, +key + 9] } }))
    .sort((a, b) => a.key === '__undated__' ? 1 : b.key === '__undated__' ? -1 : +a.key - +b.key);
}

/** Source-conserving type → place-role → place Sankey model. */
export function aggregatePlaceSankey(store, ids, placeStatements = []) {
  const recordIds = ids instanceof Set ? ids : new Set();
  const paths = new Map();
  for (const statement of placeStatements) {
    if (!recordIds.has(statement.recordId)) continue;
    const record = store.records.get(statement.recordId);
    if (!record) continue;
    const source = sourceOf(statement);
    const statementKey = source ? JSON.stringify([statement.recordId, sourceKey(source), statement.place,
      statement.roleId || statement.role || '']) : String(statement.id || `${statement.recordId}:${statement.place}:${statement.role || ''}`);
    if (paths.has(statementKey)) continue;
    paths.set(statementKey, { statementKey, recordId: statement.recordId,
      type: { key: getDocTypeId(record) || '__missing__', label: getDocTypeId(record) ? dftLabel(store, getDocTypeId(record)) : 'Ohne Dokumenttyp' },
      role: { key: statement.roleId || statement.role || '__missing__', label: statement.roleLabel || roleLabel(store, statement.roleId || statement.role) || 'Rolle nicht erfasst' },
      place: { key: cityOf(statement.place), label: cityOf(statement.place) },
      source, witness: witness('place-statement', statementKey, statement.place, statement.recordId, statement) });
  }
  const pathValues = [...paths.values()];
  const makeGroups = (left, right) => {
    const groups = new Map();
    for (const path of pathValues) {
      const key = JSON.stringify([left, path[left].key, right, path[right].key]);
      if (!groups.has(key)) groups.set(key, { left: path[left], right: path[right], records: [], witnesses: [], refs: [] });
      const group = groups.get(key); group.records.push(path.recordId); group.witnesses.push(path.witness); group.refs.push(path.source);
    }
    return [...groups.entries()].map(([key, group]) => aggregate({ key, label: `${group.left.label} → ${group.right.label}`,
      recordIds: group.records, unit: 'statements', denominator: pathValues.length,
      witnesses: group.witnesses, sourceRefs: group.refs, left: group.left, right: group.right,
      statementCount: uniqueObjects(group.witnesses, value => value.key).length }));
  };
  const links = [...makeGroups('type', 'role'), ...makeGroups('role', 'place')];
  const stages = ['type', 'role', 'place'].map((stage, stageIndex) => ({ stage, stageIndex,
    nodes: uniqueObjects(pathValues.map(path => path[stage]), value => value.key).map(value => {
      const matching = pathValues.filter(path => path[stage].key === value.key);
      return aggregate({ key: `${stage}:${value.key}`, label: value.label,
        recordIds: matching.map(path => path.recordId), unit: 'statements', denominator: pathValues.length,
        witnesses: matching.map(path => path.witness), sourceRefs: matching.map(path => path.source), stage,
        statementCount: matching.length });
    }) }));
  return { paths: pathValues, links, stages, statementCount: pathValues.length,
    recordIds: [...new Set(pathValues.map(path => path.recordId))] };
}

function setDefinitionResult(store, definition, cutIds = null) {
  if (!definition) return { ids: new Set(), witnesses: [] };
  let result;
  if (definition.type === 'records') {
    const ids = new Set((definition.ids || []).filter(id => baseIds(store).has(id)));
    result = { ids, witnesses: [...ids].map(id => recordWitness(store.records.get(id),
      'set-membership', `records:${id}`, id)) };
  } else if (definition.facet) {
    const value = definition.value;
    const filter = definition.facet === 'zeitfenster'
      ? { zeitfenster: value }
      : { [definition.facet]: [value] };
    const resolved = recordsFor(store, filter);
    result = { ids: resolved.ids, witnesses: resolved.witnesses };
  } else if (definition.type) {
    const resolved = recordsFor(store, { predicates: [definition] });
    result = { ids: resolved.ids, witnesses: resolved.witnesses };
  } else result = { ids: new Set(), witnesses: [] };
  if (!(cutIds instanceof Set)) return result;
  const ids = new Set([...result.ids].filter(id => cutIds.has(id)));
  return { ids, witnesses: result.witnesses.filter(item => ids.has(item.recordId)) };
}

export function idsForSet(store, definition, cutIds = null) {
  return setDefinitionResult(store, definition, cutIds).ids;
}

/** Inclusive/exclusive membership across a small named set collection. */
export function aggregateUpSet(store, cutIds, definitions, mode = 'inclusive') {
  const universe = cutIds instanceof Set
    ? new Set([...cutIds].filter(id => baseIds(store).has(id)))
    : new Set();
  const sets = (definitions || []).slice(0, 5).map(definition => {
    const resolved = setDefinitionResult(store, definition, universe);
    return { ...definition,
      key: definition.key || (definition.facet ? `${definition.facet}:${definition.value}` : JSON.stringify(definition)),
      label: definition.label || definition.value || definition.type,
      ids: resolved.ids, witnesses: resolved.witnesses };
  });
  const intersections = [];
  const max = 2 ** sets.length;
  for (let mask = 1; mask < max; mask += 1) {
    const include = sets.filter((_, index) => mask & (1 << index));
    const excluded = sets.filter((_, index) => !(mask & (1 << index)));
    const ids = [...universe].filter(id => include.every(set => set.ids.has(id))
      && (mode !== 'exclusive' || excluded.every(set => !set.ids.has(id))));
    intersections.push(aggregate({ key: `${mode}:${mask}`, label: include.map(set => set.label).join(' ∩ '),
      recordIds: ids, denominator: universe.size,
      witnesses: ids.flatMap(id => include.flatMap(set => {
        const matching = set.witnesses.filter(item => item.recordId === id);
        return matching.length ? matching : [witness('set-membership', set.key, set.label, id, store.records.get(id))];
      })),
      descriptor: { type: 'set-membership', include: include.map(set => ({ facet: set.facet, value: set.value })),
        exclude: mode === 'exclusive' ? excluded.map(set => ({ facet: set.facet, value: set.value })) : [] },
      include: include.map(set => set.key), exclude: mode === 'exclusive' ? excluded.map(set => set.key) : [], mode }));
  }
  intersections.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
  return { sets, intersections, denominator: universe.size, mode };
}

function categoryEntries(store, dimension, placeStatements = []) {
  if (dimension === 'doctype') return aggregateDocTypes(store).map(row => ({ key: row.id || '__missing__', label: row.label, ids: new Set(row.recordIds) }));
  if (dimension === 'composer') return aggregateComposers(store).map(row => ({ key: row.label, label: row.label, ids: new Set(row.recordIds) }));
  if (dimension === 'place' && placeStatements.length) {
    const places = new Map();
    for (const statement of placeStatements) {
      const key = cityOf(statement.place);
      if (!places.has(key)) places.set(key, new Set());
      places.get(key).add(statement.recordId);
    }
    return [...places].map(([key, ids]) => ({ key, label: key, ids }));
  }
  const mapName = { work: 'works', place: 'locations', institution: 'organizations' }[dimension] || 'works';
  return [...(store[mapName] || new Map())].map(([key, entry]) => ({ key, label: key, ids: new Set(entry.records || []) }));
}

function comparisonWitnesses(index, category, recordIds, dimension, store) {
  const ids = new Set(recordIds);
  const accepted = dimension === 'doctype' && category.key !== '__missing__'
    ? expandDftFilter(store, category.key) : new Set([category.key]);
  return [...ids].flatMap(recordId => (index.get(recordId) || [])
    .filter(member => accepted.has(member.key)).map(member => member.witness));
}

/** Pinned A against live B with denominators and overlapping membership. */
export function aggregateComparison(store, activeIds, reference, dimension = 'work', measure = 'count', { placeStatements = [] } = {}) {
  const universe = activeIds instanceof Set ? baseIds(store) : new Set();
  const b = new Set([...(activeIds instanceof Set ? activeIds : [])].filter(id => universe.has(id)));
  const a = new Set((reference?.recordIds || []).filter(id => universe.has(id)));
  const indexDimension = { work: 'work', composer: 'composer', place: 'place',
    institution: 'institution', doctype: 'doctype' }[dimension] || 'work';
  const index = dimensionIndex(store, recordsInCut(store, universe), indexDimension, placeStatements);
  const rows = categoryEntries(store, dimension, placeStatements).map(category => {
    const idsA = [...category.ids].filter(id => a.has(id));
    const idsB = [...category.ids].filter(id => b.has(id));
    const overlap = idsA.filter(id => b.has(id));
    const valueA = measure === 'share' ? (a.size ? idsA.length / a.size : null) : idsA.length;
    const valueB = measure === 'share' ? (b.size ? idsB.length / b.size : null) : idsB.length;
    const comparison = { dimension, category: { key: category.key, label: category.label },
      denominatorA: a.size, denominatorB: b.size, referenceFilter: reference?.filter || null };
    return { key: category.key, label: category.label, idsA, idsB, overlap, valueA, valueB,
      denominatorA: a.size, denominatorB: b.size, difference: valueA == null || valueB == null ? null : valueB - valueA,
      selectionA: aggregate({ key: `${category.key}:a`, label: `${category.label} · Referenz A`, recordIds: idsA,
        denominator: a.size, witnesses: comparisonWitnesses(index, category, idsA, dimension, store),
        ...comparison, comparisonSide: 'A' }),
      selectionB: aggregate({ key: `${category.key}:b`, label: `${category.label} · Auswahl B`, recordIds: idsB,
        denominator: b.size, witnesses: comparisonWitnesses(index, category, idsB, dimension, store),
        ...comparison, comparisonSide: 'B' }),
      selectionOverlap: aggregate({ key: `${category.key}:overlap`, label: `${category.label} · Überschneidung`, recordIds: overlap,
        denominator: Math.min(a.size, b.size), witnesses: comparisonWitnesses(index, category, overlap, dimension, store),
        ...comparison, comparisonSide: 'overlap' }) };
  }).filter(row => row.idsA.length || row.idsB.length);
  rows.sort((x, y) => Math.abs(y.difference || 0) - Math.abs(x.difference || 0) || x.label.localeCompare(y.label, 'de'));
  return { rows, denominatorA: a.size, denominatorB: b.size, measure,
    overlap: [...a].filter(id => b.has(id)), stale: !!reference?.stale };
}

/** Stable dataset identity for a pinned comparison reference. */
export function datasetFingerprint(store) {
  const records = store.graph?.length ? store.graph : (store.allRecords || []);
  const content = JSON.stringify({ exportDate: store.exportDate || '', records });
  let hash = 2166136261;
  for (const char of content) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `${(store.allRecords || []).length}-${(hash >>> 0).toString(16)}`;
}

function exportDimensions(item) {
  const fields = ['path', 'row', 'column', 'binding', 'left', 'right', 'stage',
    'include', 'exclude', 'mode', 'dimension', 'category', 'comparisonSide'];
  return { ...Object.fromEntries(fields
    .filter(field => item[field] != null).map(field => [field, item[field]])), ...(item.dimensions || {}) };
}

/** Rows shared by the dashboard CSV and source-reference downloads. */
export function aggregateExportRows(aggregates, context = {}) {
  return (aggregates || []).flatMap(item => {
    const witnesses = item.witnesses || [];
    const witnessRows = witnesses.map(value => ({ witness: value,
      source: value.sourceRef || value.source || null }));
    const supplemental = (item.sourceRefs || []).filter(source => !witnessRows.some(row => (
      sourceRefKey(row.source) === sourceRefKey(source)
    ))).map(source => ({ witness: null, source }));
    const rows = [...witnessRows, ...supplemental];
    if (!rows.length) rows.push({ witness: null, source: null });
    return rows.map(({ witness: value, source }) => ({
      key: item.key, label: item.label, unit: item.unit || 'documents', numerator: item.count,
      denominator: item.denominator, recordIds: (item.recordIds || []).join('|'),
      descriptor: JSON.stringify(item.descriptor || null),
      dimensions: JSON.stringify(exportDimensions(item)),
      filter: JSON.stringify(context.filter || {}),
      referenceFilter: JSON.stringify(item.referenceFilter || context.reference?.filter || null),
      comparisonSide: item.comparisonSide || '',
      denominatorA: item.denominatorA ?? '', denominatorB: item.denominatorB ?? '',
      dataset: context.fingerprint || '',
      witnessId: value?.id || value?.sourceRef?.key || value?.sourceKey || '',
      witnessKind: value?.kind || value?.dimension || '',
      witnessKey: value?.key || value?.value || '',
      witnessLabel: value?.label || '', witnessRole: value?.role || '',
      witnessRecordId: value?.recordId || '',
      sourceRecordId: source?.recordId || value?.recordId || '',
      sourceKey: source?.key || sourceRefKey(source),
      sourceSheet: source?.sheet || '', sourceRow: source?.row || '', sourceCell: source?.datenpunkt || '',
    }));
  });
}
