import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildChronikTimeline } from '../../docs/js/views/chronik-timeline-data.js';
import { baseRecords } from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
before(async () => { store = await storeFromShipped(); });

function rowAt(result, key) { return result.rows.find(row => row.key === key); }

describe('source-backed chronology separation', () => {
  test('NIM_007_11 keeps document context in 1968 and statement places on their own dates', () => {
    const record = store.records.get('m3gim-data:NIM_007_11');
    const result = buildChronikTimeline(store, [record]);
    const own = rowAt(result, '1968-11-18');
    assert.ok(own && own.sources.some(source => source.kind === 'document'));
    assert.ok(own.lanes.ort.some(entry => entry.name.includes('Zürich')),
      'der im Dokument genannte Ort fehlt am Dokumentdatum');
    for (const year of [1959, 1960, 1963, 1967]) {
      assert.ok(result.rows.some(row => row.year === year && row.sources.some(s => s.kind === 'statement')),
        `Aussagendatierung ${year} fehlt`);
    }
    assert.ok(result.rows.filter(row => row.key !== '1968-11-18')
      .every(row => !row.lanes.ort.some(entry => entry.name.includes('Zürich'))),
    'Dokumentkontext Zürich wurde auf Aussagedaten wiederholt');
  });

  test('NIM_023_5 separates rehearsal, performance and document date', () => {
    const record = store.records.get('m3gim-data:NIM_023_5');
    const result = buildChronikTimeline(store, [record]);
    assert.ok(rowAt(result, '1953-04-03'));
    assert.ok(rowAt(result, '1953-04-04'));
    assert.ok(rowAt(result, '1953-04-26').sources.some(source => source.kind === 'document'));
    assert.notEqual(rowAt(result, '1953-04-03').key, rowAt(result, '1953-04-04').key);
  });
});

test('only explicitly supplied records contribute', () => {
  const record = store.records.get('m3gim-data:NIM_023_5');
  const result = buildChronikTimeline(store, [record]);
  for (const row of [...result.rows, result.undated].filter(Boolean)) {
    assert.deepEqual([...new Set(row.sources.map(source => source.recordId))], [record['@id']]);
  }
});

test('qualifiers, ranges, precision and impossible dates stay distinct and literal', () => {
  const record = {
    '@id': 'm3gim-data:BOUNDARY', '@type': 'rico:Record',
    'rico:date': 'circa:1956',
  };
  const fake = { ...store, recordDatings: new Map([[record['@id'], [
    { rawDate: '1956-05', roleLabel: 'Monat', recordId: record['@id'] },
    { rawDate: '1956-05-03/1956-05-07', roleLabel: 'Spanne', recordId: record['@id'] },
    { rawDate: '1956-13-40', roleLabel: 'Fehler', qualityFlag: 'datierung-malformed',
      recordId: record['@id'] },
    { rawDate: '1956-05-01/1956-99-01', roleLabel: 'Fehlerhafte Spanne',
      qualityFlag: 'datierung-malformed', recordId: record['@id'] },
  ]]]) };
  const result = buildChronikTimeline(fake, [record]);
  assert.deepEqual(result.rows.map(row => [row.key, row.precision]), [
    ['circa:1956', 'circa-year'], ['1956-05', 'month'],
    ['1956-05-01/1956-99-01', 'malformed-range'],
    ['1956-05-03/1956-05-07', 'range'], ['1956-13-40', 'malformed'],
  ]);
  assert.equal(rowAt(result, '1956-13-40').dateLabel, '1956-13-40');
  assert.ok(rowAt(result, '1956-13-40').sources[0].notes.includes('datierung-malformed'));
});

test('date-like source values never become places', () => {
  const record = {
    '@id': 'm3gim-data:PSEUDO_PLACE', '@type': 'rico:Record', 'rico:date': '1956',
    'rico:hasOrHadLocation': [{ name: '06-09' }, { name: '1956-11-21' }, { name: 'Graz' }],
  };
  const fake = { ...store, recordDatings: new Map(), recordToPerformances: new Map(),
    agentRelations: new Map() };
  const row = rowAt(buildChronikTimeline(fake, [record]), '1956');
  assert.deepEqual(row.lanes.ort.map(entry => entry.name), ['Graz']);
});

test('year breaks respect the ends of overlapping recorded ranges', () => {
  const record = { '@id': 'm3gim-data:RANGES', 'rico:date': '1924/1925' };
  const fake = { ...store, recordDatings: new Map([[record['@id'], [
    { rawDate: '1929/1935', roleLabel: 'Zeitraum' },
    { rawDate: '1930', roleLabel: 'erwähnt' },
    { rawDate: '1934', roleLabel: 'erwähnt' },
    { rawDate: '1940', roleLabel: 'erwähnt' },
  ]]]), recordToPerformances: new Map(), agentRelations: new Map() };
  const result = buildChronikTimeline(fake, [record]);
  assert.equal(rowAt(result, '1924/1925').endYear, 1925);
  assert.deepEqual(rowAt(result, '1929/1935').gapBefore, { from: 1925, to: 1929 });
  assert.equal(rowAt(result, '1934').gapBefore, null, 'overlapping interval was treated as a gap');
  assert.deepEqual(rowAt(result, '1940').gapBefore, { from: 1935, to: 1940 });
});

test('same named raw and identified agents merge without losing evidence', () => {
  const record = {
    '@id': 'm3gim-data:MERGE', '@type': 'rico:Record', 'rico:date': '1956',
    'm3gim-ontology:hasAssociatedAgent': [
      { name: 'Malaniuk, Ira', '@type': 'rico:Person' },
      { name: 'Malaniuk, Ira', '@type': 'rico:Person', '@id': 'wd:Q94208' },
    ],
  };
  const fake = { ...store, recordDatings: new Map(), recordToPerformances: new Map(),
    agentRelations: new Map() };
  const people = rowAt(buildChronikTimeline(fake, [record]), '1956').lanes.person;
  assert.equal(people.length, 1);
  assert.equal(people[0].key, 'person:wd:Q94208');
});

test('source-local person mentions remain individually keyed', () => {
  const result = buildChronikTimeline(store, baseRecords(store));
  let checked = 0;
  for (const row of result.rows) {
    const byAuthority = new Map();
    for (const entry of row.lanes.person) {
      if (!entry.key.startsWith('person:')) continue;
      assert.ok(!byAuthority.has(entry.key), `${row.key}: doppelte Personenidentität ${entry.key}`);
      byAuthority.set(entry.key, entry);
      checked++;
    }
  }
  assert.ok(checked > 100, `nur ${checked} Personenangaben geprüft`);
});

test('real stage roles are typed as parts and never enter the work lane', () => {
  const record = store.records.get('m3gim-data:NIM_139_104');
  const result = buildChronikTimeline(store, [record]);
  const entries = [...result.rows, result.undated].filter(Boolean);
  const parts = entries.flatMap(row => row.lanes.part);
  assert.ok(parts.length >= 5, `nur ${parts.length} reale Partien gefunden`);
  assert.ok(parts.every(entry => entry.family === 'part'
    && entry.key.startsWith('part:m3gim-data:stagerole_')));
  assert.ok(entries.flatMap(row => row.lanes.werk)
    .every(entry => entry.family === 'werk' && !entry.roles.includes('Partie')));
});

test('undated mobility annotations retain place, role and annotation evidence as document context', () => {
  for (const [recordId, expectedPlace] of [
    ['m3gim-data:NIM_005_16', 'Napoli'],
    ['m3gim-data:NIM_005_17', 'Roma'],
  ]) {
    const record = store.records.get(recordId);
    assert.ok(record, `${recordId} fehlt im Datenstand`);
    const result = buildChronikTimeline(store, [record]);
    const rows = [...result.rows, result.undated].filter(Boolean);
    const evidence = rows.flatMap(row => row.lanes.ort)
      .filter(entry => entry.name === expectedPlace)
      .flatMap(entry => entry.evidence)
      .find(item => item.recordId === recordId && item.label === 'vertragsort');
    assert.ok(evidence, `${expectedPlace} als vertragsort fehlt`);
    assert.equal(evidence.context, 'document');
    assert.equal(evidence.date, null, 'undatierter Ort erhielt ein erfundenes Datum');
    assert.match(evidence.annotationId, /^m3gim-data:ev_/);
    assert.ok(evidence.xlsxSource && evidence.xlsxSource.row > 1);
  }
});

test('records without any own date keep document context in one undated row', () => {
  const record = {
    '@id': 'm3gim-data:UNDATED', '@type': 'rico:Record',
    'm3gim-ontology:hasAssociatedAgent': {
      name: 'Beispiel, Ada', '@type': 'rico:Person', role: 'erwähnt',
    },
  };
  const fake = { ...store, recordDatings: new Map(), recordToPerformances: new Map(),
    agentRelations: new Map() };
  const result = buildChronikTimeline(fake, [record]);
  assert.equal(result.rows.length, 0);
  assert.equal(result.undated.sources[0].kind, 'document');
  assert.equal(result.undated.lanes.person[0].name, 'Beispiel, Ada');
});

test('dense real corpus deduplicates lane entries and source records per date', () => {
  const result = buildChronikTimeline(store, baseRecords(store));
  assert.ok(result.rows.length > 100);
  for (const row of result.rows) {
    assert.equal(new Set(row.sources.map(source => source.recordId)).size, row.sources.length);
    for (const family of ['ort', 'person', 'werk', 'part', 'institution']) {
      assert.equal(new Set(row.lanes[family].map(entry => entry.key)).size, row.lanes[family].length);
    }
  }
  const dense = result.rows.reduce((best, row) => row.sources.length > best.sources.length ? row : best);
  assert.ok(dense.sources.length >= 5, `dichteste Zeile hat nur ${dense.sources.length} Quellen`);
  const day = result.rows.filter(row => row.precision === 'day')
    .reduce((best, row) => !best || row.sources.length > best.sources.length ? row : best, null);
  assert.equal(day.key, '1953-07-26');
  assert.equal(day.sources.length, 6);
});
