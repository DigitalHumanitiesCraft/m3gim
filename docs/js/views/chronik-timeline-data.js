/** Pure projection of the selected records onto dated chronology lanes. */

import { formatDate, splitQualifier } from '../utils/date-parser.js';
import { ensureArray, roleIdOf, roleLabel } from '../utils/format.js';
import { extractXlsxSource } from '../utils/provenance.js';

const FAMILIES = ['ort', 'person', 'werk', 'part', 'institution'];
const QUALIFIER_LABEL = { circa: 'ca.', vor: 'vor', nach: 'nach', ab: 'ab', seit: 'seit' };

export function dateMeta(raw) {
  const text = raw == null ? null : String(raw).trim();
  if (!text) return { key: 'undated', dateLabel: 'Ohne Datum', year: null,
    precision: 'undated', sortKey: '9999-99-99|undated' };
  const { qualifier, value } = splitQualifier(text);
  let precision = 'malformed';
  if (value.includes('/')) {
    const parts = value.split('/');
    precision = parts.length === 2 && parts.every(part => dateMeta(part).precision !== 'malformed')
      ? 'range' : 'malformed-range';
  }
  else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yearPart, monthPart, dayPart] = value.split('-').map(Number);
    const probe = new Date(Date.UTC(yearPart, monthPart - 1, dayPart));
    if (probe.getUTCFullYear() === yearPart && probe.getUTCMonth() === monthPart - 1
      && probe.getUTCDate() === dayPart) precision = 'day';
  } else if (/^\d{4}-\d{2}$/.test(value)) {
    const month = Number(value.slice(5));
    if (month >= 1 && month <= 12) precision = 'month';
  }
  else if (/^\d{4}$/.test(value)) precision = 'year';
  if (qualifier) precision = `${qualifier}-${precision}`;
  const yearMatch = value.match(/^\d{4}/);
  const year = yearMatch ? Number(yearMatch[0]) : null;
  const display = precision.includes('malformed') ? value : (formatDate(value) || text);
  const dateLabel = qualifier ? `${QUALIFIER_LABEL[qualifier] || qualifier} ${display}` : display;
  const sortable = year == null ? '9998-99-99' : value.split('/')[0].padEnd(10, '-00');
  const endYear = precision.includes('malformed') ? year
    : value.includes('/') ? dateMeta(value.split('/')[1]).year : year;
  return { key: text, dateLabel, year, endYear, precision, sortKey: `${sortable}|${text}` };
}

function notesOf(node) {
  return ensureArray(node && (node['m3gim-ontology:dataQualityFlag']
    || node.qualityFlag)).filter(Boolean).map(String).concat(
    ensureArray(node && (node['rico:generalDescription'] || node.description))
      .filter(Boolean).map(String),
  );
}

function sourceLabel(store, role, fallback) {
  return role ? roleLabel(store, role) : fallback;
}

function identityOf(node, name) {
  return node && (node['@id'] || node.wikidata) || name.trim().toLocaleLowerCase('de-AT');
}

function makeCollector() {
  const rows = new Map();
  function rowFor(date) {
    const meta = dateMeta(date);
    if (!rows.has(meta.key)) {
      rows.set(meta.key, { ...meta, sources: [], lanes: Object.fromEntries(
        FAMILIES.map(family => [family, []])), _sources: new Map(), _entries: new Map() });
    }
    return rows.get(meta.key);
  }
  function addSource(row, recordId, kind, label, notes = [], evidence = null) {
    const previous = row._sources.get(recordId);
    if (!previous) {
      const source = { recordId, kind, labels: label ? [label] : [], notes: [...new Set(notes)] };
      if (evidence) source.evidence = [evidence];
      row._sources.set(recordId, source);
      row.sources.push(source);
      return;
    }
    if (kind === 'document') previous.kind = 'document';
    if (label && !previous.labels.includes(label)) previous.labels.push(label);
    for (const note of notes) if (!previous.notes.includes(note)) previous.notes.push(note);
    if (evidence) {
      if (!previous.evidence) previous.evidence = [];
      const signature = JSON.stringify(evidence);
      if (!previous.evidence.some(item => JSON.stringify(item) === signature)) previous.evidence.push(evidence);
    }
  }
  function addEntry(row, family, node, recordId, role, context, date, notes = [], xlsxSource = null) {
    const name = node && (node.name || node['rico:name'] || node['skos:prefLabel']);
    if (!name) return;
    const normalizedName = name.trim().toLocaleLowerCase('de-AT');
    const identity = identityOf(node, name);
    const sameName = row.lanes[family].filter(candidate => candidate._name === normalizedName);
    let entry = row.lanes[family].find(candidate => candidate._identity === identity)
      || sameName.find(candidate => candidate._identity === candidate._name || identity === normalizedName);
    if (!entry) {
      const key = `${family}:${identity}`;
      entry = { key, family, name, roles: [], recordIds: [], evidence: [], notes: [] };
      entry._name = normalizedName;
      entry._identity = identity;
      row._entries.set(`${row.key}\u001f${key}`, entry);
      row.lanes[family].push(entry);
    } else if (entry._identity === entry._name && identity !== normalizedName) {
      entry._identity = identity;
      entry.key = `${family}:${identity}`;
    }
    if (role && !entry.roles.includes(role)) entry.roles.push(role);
    if (!entry.recordIds.includes(recordId)) entry.recordIds.push(recordId);
    const evidence = { recordId, label: role || 'Im Dokument', context, date, notes: [...new Set(notes)] };
    if (xlsxSource) evidence.xlsxSource = xlsxSource;
    const signature = JSON.stringify(evidence);
    const existingEvidence = entry.evidence.find(item => JSON.stringify(item) === signature);
    if (!existingEvidence) entry.evidence.push(evidence);
    for (const note of notes) if (!entry.notes.includes(note)) entry.notes.push(note);
    return existingEvidence || evidence;
  }
  return { rows, rowFor, addSource, addEntry };
}

function documentEntities(store, record, row, collector) {
  const recordId = record['@id'];
  const add = (family, node) => {
    if (!node || typeof node !== 'object') return;
    const name = node.name || node['rico:name'] || node['skos:prefLabel'] || '';
    if (family === 'ort' && /^\d{2}-\d{2}(?:$|\s)|^\d{4}(?:-\d{2}){0,2}(?:$|\/)/.test(name)) return;
    const role = sourceLabel(store, node.role, 'Im Dokument');
    collector.addEntry(row, family, node, recordId, role, 'document', row.key === 'undated' ? null : row.key,
      notesOf(node), extractXlsxSource(node));
  };
  for (const node of ensureArray(record['m3gim-ontology:hasAssociatedAgent'])) {
    add(node['@type'] === 'rico:Person' ? 'person' : 'institution', node);
  }
  for (const node of ensureArray(record['rico:hasOrHadLocation'])) add('ort', node);
  for (const annotationId of store.recordToEvents.get(recordId) || []) {
    const annotation = store.mobilityEvents.get(annotationId);
    if (!annotation || annotation.rawDate || !annotation.place) continue;
    const role = annotation.roleLabel || annotation.role || 'Im Dokument';
    const evidence = collector.addEntry(row, 'ort', {
      name: annotation.place, '@id': annotation.placeWikidata,
    }, recordId, role, 'document', null, notesOf(annotation), annotation.xlsxSource);
    if (evidence) evidence.annotationId = annotation.id;
  }
  for (const node of ensureArray(record['rico:hasOrHadSubject'])) {
    if (node && node['@type'] === 'rico:Person') add('person', node);
    else if (node && node['@type'] === 'm3gim-ontology:MusicalWork') add('werk', node);
  }
  for (const rel of store.agentRelations.get(recordId) || []) {
    if (!rel.objectName) continue;
    add('person', { name: rel.objectName, '@id': rel.objectWikidata,
      role: rel.objectRoleLabel || null,
      'm3gim-ontology:xlsxSource': rel.xlsxSource && {
        'm3gim-ontology:xlsxSheet': rel.xlsxSource.sheet,
        'm3gim-ontology:xlsxRow': rel.xlsxSource.row,
        'm3gim-ontology:dataPointId': rel.xlsxSource.datenpunkt,
      } });
  }
  for (const perf of store.recordToPerformances.get(recordId) || []) {
    if (perf.date) continue;
    const raw = store.performances.get(perf.id);
    const source = extractXlsxSource(raw);
    for (const performer of ensureArray(raw && raw['m3gim-ontology:hasPerformer'])) {
      collector.addEntry(row, 'person', performer, recordId,
      'Interpret:in', 'document', row.key === 'undated' ? null : row.key, notesOf(raw), source);
    }
    for (const roleRef of ensureArray(raw && raw['m3gim-ontology:hasStageRole'])) {
      const name = roleRef && roleRef['@id'] && store.stageRoles.get(roleRef['@id']);
      if (name) collector.addEntry(row, 'part', { name, '@id': roleRef['@id'] }, recordId,
        'Partie', 'document', row.key === 'undated' ? null : row.key, notesOf(raw), source);
    }
  }
}

function statementRows(store, record, collector) {
  const recordId = record['@id'];
  for (const dating of store.recordDatings.get(recordId) || []) {
    if (!dating.rawDate || dating.origin === 'creationDate') continue;
    const row = collector.rowFor(dating.rawDate);
    const label = dating.roleLabel || dating.role || 'Datierung';
    const notes = notesOf(dating);
    collector.addSource(row, recordId, 'statement', label, notes, {
      annotationId: dating.id || null, xlsxSource: dating.xlsxSource || null,
    });
    if (dating.place) collector.addEntry(row, 'ort', {
      name: dating.place, '@id': dating.placeWikidata,
    }, recordId, label, 'statement', dating.rawDate, notes, dating.xlsxSource);
  }
  for (const perf of store.recordToPerformances.get(recordId) || []) {
    if (!perf.date) continue;
    const row = collector.rowFor(perf.date);
    const raw = store.performances.get(perf.id);
    const notes = notesOf(raw);
    collector.addSource(row, recordId, 'statement', 'Aufführung', notes, {
      performanceId: perf.id, xlsxSource: extractXlsxSource(raw),
    });
    const rawWork = raw && raw['m3gim-ontology:performanceOf'];
    if (rawWork && (rawWork.name || rawWork['skos:prefLabel'])) collector.addEntry(row, 'werk', rawWork, recordId,
      'Aufführung', 'statement', perf.date, notes, extractXlsxSource(raw));
    for (const performer of ensureArray(raw && raw['m3gim-ontology:hasPerformer'])) {
      collector.addEntry(row, 'person', performer, recordId,
        'Interpret:in', 'statement', perf.date, notes, extractXlsxSource(raw));
    }
    for (const roleRef of ensureArray(raw && raw['m3gim-ontology:hasStageRole'])) {
      const name = roleRef && roleRef['@id'] && store.stageRoles.get(roleRef['@id']);
      if (name) collector.addEntry(row, 'part', { name, '@id': roleRef['@id'] }, recordId,
        'Partie', 'statement', perf.date, notes, extractXlsxSource(raw));
    }
  }
}

/** Build chronology rows from exactly the records supplied by the shared cut. */
export function buildChronikTimeline(store, records) {
  const collector = makeCollector();
  for (const record of records || []) {
    if (!record || !record['@id']) continue;
    const ownDates = [...new Set(ensureArray(record['rico:date'])
      .concat(ensureArray(record['rico:creationDate'])).filter(Boolean).map(String))];
    const contextRows = ownDates.length > 0
      ? ownDates.map(date => collector.rowFor(date))
      : [collector.rowFor(null)];
    for (const row of contextRows) {
      const labels = [];
      if (record['rico:date'] && ensureArray(record['rico:date']).map(String).includes(row.key)) {
        labels.push('Quellendatierung');
      }
      if (record['rico:creationDate'] && ensureArray(record['rico:creationDate']).map(String).includes(row.key)) {
        labels.push('Entstehung');
      }
      if (labels.length === 0) labels.push('Ohne Datum');
      for (const label of labels) collector.addSource(row, record['@id'], 'document', label,
        notesOf(record), { xlsxSource: extractXlsxSource(record) });
      documentEntities(store, record, row, collector);
    }
    statementRows(store, record, collector);
  }
  const clean = row => {
    for (const family of FAMILIES) row.lanes[family].sort((a, b) => a.name.localeCompare(b.name, 'de-AT'));
    for (const family of FAMILIES) {
      for (const entry of row.lanes[family]) {
        delete entry._name;
        delete entry._identity;
      }
    }
    delete row._sources;
    delete row._entries;
    return row;
  };
  const undated = collector.rows.has('undated') ? clean(collector.rows.get('undated')) : null;
  const rows = [...collector.rows.values()].filter(row => row.key !== 'undated')
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map(clean);
  let coveredThrough = null;
  for (const row of rows) {
    row.gapBefore = coveredThrough != null && row.year != null && row.year > coveredThrough + 1
      ? { from: coveredThrough, to: row.year } : null;
    if (row.year != null) coveredThrough = Math.max(coveredThrough ?? row.year, row.year, row.endYear ?? row.year);
  }
  return { rows, undated };
}
