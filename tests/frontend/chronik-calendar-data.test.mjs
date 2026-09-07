import { before, test } from 'node:test';
import assert from 'node:assert/strict';

import { baseRecords } from '../../docs/js/data/records-for.js';
import { aggregateCalendarGroup } from '../../docs/js/views/chronik-calendar-data.js';
import { buildChronikTimeline } from '../../docs/js/views/chronik-timeline-data.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
before(async () => { store = await storeFromShipped(); });

function calendarGroup(rows, key = 'day-1953-07-26', label = '26. Juli 1953') {
  return { kind: 'group', key, label, start: 0, end: 1, y: 10, height: 250, year: 1953, rows };
}

test('shipped dense day preserves 6 sources, 46 people and 26 parts', () => {
  const timeline = buildChronikTimeline(store, baseRecords(store));
  const row = timeline.rows.find(item => item.key === '1953-07-26');
  const result = aggregateCalendarGroup(calendarGroup([row]));
  assert.equal(result.sources.length, 6);
  assert.equal(result.lanes.person.length, 46);
  assert.equal(result.lanes.werk.length, 10);
  assert.equal(result.lanes.part.length, 26);
  assert.equal(result.dateLabel, '26. Juli 1953');
});

test('one record retains its distinct date contexts without inventing a document date', () => {
  const record = store.records.get('m3gim-data:NIM_023_5');
  const rows = buildChronikTimeline(store, [record]).rows;
  const result = aggregateCalendarGroup(calendarGroup(rows, 'year-1953', '1953'));
  const source = result.sources.find(item => item.recordId === record['@id']);
  assert.equal(result.sources.length, 1);
  assert.deepEqual(source.contexts.map(item => item.row.key), ['1953-04-03', '1953-04-04', '1953-04-26']);
  assert.equal(source.contexts.filter(item => item.source.kind === 'document').length, 1);
  assert.equal(source.contexts.find(item => item.source.kind === 'document').row.key, '1953-04-26');
});

test('Wuppertal remains attached only to its source row and record context', () => {
  const record = store.records.get('m3gim-data:NIM_023_5');
  const rows = buildChronikTimeline(store, [record]).rows;
  const result = aggregateCalendarGroup(calendarGroup(rows, 'year-1953', '1953'));
  const places = result.lanes.ort.filter(entry => entry.name === 'Wuppertal');
  assert.equal(places.length, 1);
  assert.deepEqual(places[0].recordIds, [record['@id']]);
  assert.ok(places[0].evidence.every(item => item.recordId === record['@id']));
});

test('the supplied filter cut cannot acquire sources from other records', () => {
  const record = store.records.get('m3gim-data:NIM_023_5');
  const rows = buildChronikTimeline(store, [record]).rows;
  const result = aggregateCalendarGroup(calendarGroup(rows));
  assert.deepEqual(result.sources.map(source => source.recordId), [record['@id']]);
  for (const entries of Object.values(result.lanes)) {
    assert.ok(entries.every(entry => entry.recordIds.every(id => id === record['@id'])));
  }
});

test('entity evidence merges losslessly only within family and stable key', () => {
  const evidence = { recordId: 'r1', label: 'Ort', context: 'document', date: null,
    notes: ['original'], annotationId: 'a1', xlsxSource: { sheet: 'S', row: 2 } };
  const first = { key: '1953-01-01', sources: [], lanes: {
    ort: [{ key: 'shared', family: 'ort', name: 'Ort', recordIds: ['r1'], roles: ['Ort'], evidence: [evidence], notes: ['n1'] }],
    person: [{ key: 'shared', family: 'person', name: 'Person', recordIds: ['r1'], roles: ['Person'], evidence: [evidence], notes: [] }],
  } };
  const secondEvidence = { ...evidence, recordId: 'r2', annotationId: 'a2' };
  const second = { key: '1953-01-02', sources: [], lanes: {
    ort: [{ key: 'shared', family: 'ort', name: 'Ort', recordIds: ['r2'], roles: ['Ziel'], evidence: [secondEvidence], notes: ['n2'] }],
  } };
  const result = aggregateCalendarGroup(calendarGroup([first, second]));
  assert.equal(result.lanes.ort.length, 1);
  assert.deepEqual(result.lanes.ort[0].recordIds, ['r1', 'r2']);
  assert.deepEqual(result.lanes.ort[0].roles, ['Ort', 'Ziel']);
  assert.deepEqual(result.lanes.ort[0].notes, ['n1', 'n2']);
  assert.deepEqual(result.lanes.ort[0].evidence, [evidence, secondEvidence]);
  assert.equal(result.lanes.ort[0].evidence[0].date, null);
  assert.equal(result.lanes.person.length, 1);
});

test('aggregation leaves row source and lane arrays unchanged', () => {
  const row = buildChronikTimeline(store, [store.records.get('m3gim-data:NIM_023_5')]).rows[0];
  const sourceArray = row.sources; const personArray = row.lanes.person;
  const sourceSnapshot = structuredClone(sourceArray); const personSnapshot = structuredClone(personArray);
  const result = aggregateCalendarGroup(calendarGroup([row]));
  assert.strictEqual(row.sources, sourceArray);
  assert.strictEqual(row.lanes.person, personArray);
  assert.deepEqual(row.sources, sourceSnapshot);
  assert.deepEqual(row.lanes.person, personSnapshot);
  assert.notStrictEqual(result.sources, row.sources);
  assert.notStrictEqual(result.lanes.person, row.lanes.person);
});
