/** DOM-free matching witnesses for typed predicates and aggregate dimensions. */

import { createWitness, uniqueWitnesses } from './evidence.js';
import {
  ensureArray, cityOf, getDocTypeId, expandDftFilter, dftLabel, roleIdOf, roleToken,
} from '../utils/format.js';
import { foldText } from '../utils/normalize.js';

export const MISSING_ROLE = '__missing__';

const AGENT_FAMILY = Object.freeze({
  'rico:CorporateBody': 'institution',
  'rico:Group': 'institution',
  'rico:Person': 'person',
});

const SUBJECT_FAMILY = Object.freeze({
  'rico:Person': 'person',
  'm3gim-ontology:MusicalWork': 'werk',
});

function nameOf(entry) {
  return entry?.name || entry?.['skos:prefLabel'] || '';
}

function roleOf(entry) {
  return roleIdOf(entry?.role) || roleToken(entry?.role) || entry?.roleId || entry?.role
    || entry?.['m3gim-ontology:recordedRole'] || '';
}

function detailType(entry) {
  if (entry?.['m3gim-ontology:monetaryAmount'] != null) return 'finanz';
  return String(entry?.['m3gim-ontology:recordedType']
    ?? entry?.['m3gim-ontology:detailField'] ?? '').trim().toLocaleLowerCase('de-AT')
    || 'angabe';
}

function annotationsOf(store, recordId) {
  const ids = store?.recordToAnnotations?.get(recordId) || [];
  return ids.map(id => store.annotations.get(id)).filter(Boolean);
}

function entityValue(family, value) {
  return family === 'person' ? String(value || '').trim() : value;
}

function placeMatches(store, selected, observed) {
  if (selected === observed) return true;
  // The place facet rolls an address up only when the raw city identity exists.
  return store?.locations?.has(selected) && cityOf(observed) === selected;
}

function entriesForRecord(store, record, family) {
  const recordId = record['@id'];
  if (family === 'ort') {
    return [
      ...ensureArray(record['rico:hasOrHadLocation']).map((entry, ordinal) => ({
        entry, ordinal, value: nameOf(entry), role: roleOf(entry), nodeId: entry?.['@id'], kind: 'place',
      })),
      ...annotationsOf(store, recordId).filter(entry => entry.place)
        .map((entry, ordinal) => ({
          entry: entry.xlsxSource, ordinal, value: entry.place, role: entry.roleId || entry.role,
          nodeId: entry.id, kind: 'place', country: entry.placeCountry,
        })),
    ];
  }
  const agents = ensureArray(record['m3gim-ontology:hasAssociatedAgent'])
    .filter(entry => AGENT_FAMILY[entry?.['@type']] === family);
  const subjects = ensureArray(record['rico:hasOrHadSubject'])
    .filter(entry => SUBJECT_FAMILY[entry?.['@type']] === family);
  return [...agents, ...subjects].map((entry, ordinal) => ({
    entry, ordinal, value: entityValue(family, nameOf(entry)), role: roleOf(entry),
    nodeId: entry?.['@id'], kind: family,
  }));
}

/**
 * Source entries matching at least one allowed entity-role pair. Entity and
 * role are tested on the same entry, so a co-mention elsewhere in the record
 * cannot satisfy the predicate.
 */
export function boundEntityRoleWitnesses(store, predicate, candidateIds) {
  const candidates = new Set(candidateIds || []);
  const entities = new Set(predicate.entities);
  const roles = new Set(predicate.roles);
  const out = [];
  for (const record of store?.allRecords || []) {
    const recordId = record['@id'];
    if (!candidates.has(recordId)) continue;
    for (const item of entriesForRecord(store, record, predicate.family)) {
      const entityMatch = predicate.family === 'ort'
        ? [...entities].some(selected => placeMatches(store, selected, item.value))
        : entities.has(item.value);
      const matchedRole = item.role || MISSING_ROLE;
      if (!entityMatch || !roles.has(matchedRole)) continue;
      out.push(createWitness({
        recordId,
        dimension: predicate.family,
        value: item.value,
        role: item.role || null,
        source: item.entry,
        nodeId: item.nodeId,
        kind: item.kind,
        ordinal: item.ordinal,
      }));
    }
  }
  return uniqueWitnesses(out);
}

/** Complete matching source rows for one simple facet member. */
export function facetMemberWitnesses(store, facet, value, candidateIds) {
  const candidates = new Set(candidateIds || []);
  const out = [];
  const docTypes = facet === 'docType' ? expandDftFilter(store, value) : null;
  for (const record of store?.allRecords || []) {
    const recordId = record['@id'];
    if (!candidates.has(recordId)) continue;
    if (facet === 'docType' && docTypes.has(getDocTypeId(record))) {
      out.push(createWitness({ recordId, dimension: facet, value, source: record,
        nodeId: recordId, kind: 'record' }));
      continue;
    }
    if (['ort', 'person', 'institution'].includes(facet)) {
      for (const item of entriesForRecord(store, record, facet)) {
        const matches = facet === 'ort' ? placeMatches(store, value, item.value) : item.value === value;
        if (matches) out.push(createWitness({ recordId, dimension: facet, value: item.value,
          role: item.role, source: item.entry, nodeId: item.nodeId, kind: item.kind,
          ordinal: item.ordinal }));
      }
      continue;
    }
    const addEntry = (entry, dimension, entryValue, role, kind, ordinal) => {
      if (entryValue !== value) return;
      out.push(createWitness({ recordId, dimension, value: entryValue, role,
        source: entry, nodeId: entry?.id || entry?.['@id'], kind, ordinal }));
    };
    if (facet === 'werk') {
      ensureArray(record['rico:hasOrHadSubject']).forEach((entry, ordinal) => {
        if (SUBJECT_FAMILY[entry?.['@type']] === 'werk') {
          addEntry(entry, facet, nameOf(entry), roleOf(entry), 'werk', ordinal);
        }
      });
    } else if (facet === 'ensemble') {
      ensureArray(record['m3gim-ontology:hasAssociatedAgent']).forEach((entry, ordinal) => {
        if (entry?.['@type'] === 'rico:Group') {
          addEntry(entry, facet, nameOf(entry), roleOf(entry), 'ensemble', ordinal);
        }
      });
    } else if (facet === 'ereignis') {
      annotationsOf(store, recordId).forEach((entry, ordinal) => {
        addEntry(entry.xlsxSource, facet, entry.roleId || entry.role, entry.roleId || entry.role,
          'annotation', ordinal);
      });
    } else if (facet === 'finanzen') {
      (store?.finances?.get(recordId) || []).forEach((entry, ordinal) => {
        addEntry(entry.xlsxSource, facet, entry.currency, entry.role || null, 'finance', ordinal);
      });
    } else if (facet === 'land') {
      for (const item of entriesForRecord(store, record, 'ort')) {
        const country = item.entry?.['m3gim-ontology:country'] || item.country || null;
        addEntry(item.entry, facet, country, item.role, item.kind, item.ordinal);
      }
    } else if (facet === 'verknuepfung') {
      const split = value.indexOf(':');
      const type = split < 0 ? value : value.slice(0, split);
      const selectedRole = split < 0 ? null : value.slice(split + 1);
      let entries = [];
      if (['ort', 'person', 'institution'].includes(type)) {
        entries = entriesForRecord(store, record, type);
      } else if (type === 'werk' || type === 'ereignis') {
        const expected = type === 'werk' ? 'm3gim-ontology:MusicalWork'
          : 'm3gim-ontology:FramingEvent';
        entries = ensureArray(record['rico:hasOrHadSubject'])
          .filter(entry => entry?.['@type'] === expected)
          .map((entry, ordinal) => ({ entry, ordinal, value: nameOf(entry),
            role: roleOf(entry), kind: type }));
      } else if (type === 'ensemble') {
        entries = ensureArray(record['m3gim-ontology:hasAssociatedAgent'])
          .filter(entry => entry?.['@type'] === 'rico:Group')
          .map((entry, ordinal) => ({ entry, ordinal, value: nameOf(entry),
            role: roleOf(entry), kind: type }));
      } else if (type === 'datum') {
        entries = annotationsOf(store, recordId).filter(entry => !entry.place)
          .map((entry, ordinal) => ({ entry: entry.xlsxSource, ordinal,
            value: entry.date, role: entry.roleId || entry.role,
            nodeId: entry.id, kind: 'annotation' }));
      }
      entries.push(...ensureArray(record['m3gim-ontology:hasDetail'])
        .filter(entry => detailType(entry) === type)
        .map((entry, ordinal) => ({ entry, ordinal,
          value: entry['m3gim-ontology:detailValue'] || '', role: roleOf(entry),
          nodeId: entry?.['@id'], kind: 'detail' })));
      for (const item of entries) {
        if (selectedRole && (item.role || MISSING_ROLE) !== selectedRole) continue;
        out.push(createWitness({ recordId, dimension: facet, value,
          role: item.role, source: item.entry, nodeId: item.nodeId, kind: item.kind,
          ordinal: item.ordinal }));
      }
    }
  }
  return uniqueWitnesses(out);
}

/** Source rows whose recorded or indexed values contribute to a text match. */
export function searchMatchWitnesses(store, record, query) {
  if (!record) return [];
  const recordId = record['@id'];
  const terms = foldText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const contributes = value => {
    const folded = foldText(value);
    return terms.some(term => folded.includes(term));
  };
  const out = [];
  const recordValues = [
    record['rico:identifier'], record['rico:title'],
    dftLabel(store, getDocTypeId(record)), record['rico:date'],
  ];
  if (recordValues.some(contributes)) {
    out.push(createWitness({ recordId, dimension: 'search', value: query,
      source: record, nodeId: recordId, kind: 'record' }));
  }
  for (const family of ['person', 'institution', 'ort', 'werk']) {
    for (const item of entriesForRecord(store, record, family)) {
      if (!contributes(item.value)) continue;
      out.push(createWitness({
        recordId,
        dimension: family,
        value: item.value,
        role: item.role || null,
        source: item.entry,
        nodeId: item.nodeId,
        kind: item.kind,
        ordinal: item.ordinal,
      }));
    }
  }
  return uniqueWitnesses(out);
}

function displayRole(store, entry, role) {
  if (!role) return 'Ohne erfasste Rolle';
  const direct = typeof entry?.role === 'object' && entry.role['skos:prefLabel'];
  const indexed = store?.roleVocab?.get(role)?.label
    || store?.conceptDefinitions?.get(role)?.label;
  return direct || indexed || `Rolle ohne Bezeichnung (${role})`;
}

/**
 * Complete role inventory with source witnesses, including missing roles,
 * missing display forms and pure event/date entries. This is a presentation
 * inventory; `__missing__` is not an ontology term and never enters the store.
 */
export function linkRoleInventory(store, candidateIds) {
  const candidates = candidateIds == null
    ? new Set((store?.allRecords || []).map(record => record['@id']))
    : new Set(candidateIds);
  const groups = new Map();
  const add = (recordId, type, entry, ordinal, overrides = {}) => {
    if (!candidates.has(recordId)) return;
    const role = (overrides.role ?? roleOf(entry)) || null;
    const key = `${type}:${role || MISSING_ROLE}`;
    if (!groups.has(key)) groups.set(key, {
      type,
      value: key,
      role,
      label: overrides.label || displayRole(store, entry, role),
      recordIds: new Set(),
      witnesses: [],
    });
    const group = groups.get(key);
    group.recordIds.add(recordId);
    group.witnesses.push(createWitness({
      recordId,
      dimension: 'verknuepfung',
      value: type,
      role,
      source: overrides.source || entry,
      nodeId: overrides.nodeId || entry?.id || entry?.['@id'],
      kind: overrides.kind || type,
      ordinal,
    }));
  };

  for (const record of store?.allRecords || []) {
    const recordId = record['@id'];
    ensureArray(record['m3gim-ontology:hasAssociatedAgent']).forEach((entry, ordinal) => {
      const type = entry?.['@type'] === 'rico:Group' ? 'ensemble'
        : AGENT_FAMILY[entry?.['@type']];
      if (type) add(recordId, type, entry, ordinal);
    });
    ensureArray(record['rico:hasOrHadSubject']).forEach((entry, ordinal) => {
      const type = entry?.['@type'] === 'm3gim-ontology:FramingEvent' ? 'ereignis'
        : SUBJECT_FAMILY[entry?.['@type']];
      if (type) add(recordId, type, entry, ordinal);
    });
    ensureArray(record['rico:hasOrHadLocation']).forEach((entry, ordinal) => {
      add(recordId, 'ort', entry, ordinal);
    });
    ensureArray(record['m3gim-ontology:hasDetail']).forEach((entry, ordinal) => {
      add(recordId, detailType(entry), entry, ordinal);
    });
    annotationsOf(store, recordId).forEach((entry, ordinal) => {
      add(recordId, entry.place ? 'ort' : 'datum', entry, ordinal, {
        role: entry.roleId || entry.role || null,
        label: entry.roleLabel || undefined,
        source: entry.xlsxSource,
        nodeId: entry.id,
        kind: 'annotation',
      });
    });
  }

  return [...groups.values()].map(group => Object.freeze({
    ...group,
    count: group.recordIds.size,
    witnesses: uniqueWitnesses(group.witnesses),
  })).sort((a, b) => a.type.localeCompare(b.type)
    || b.count - a.count || a.label.localeCompare(b.label, 'de'));
}
